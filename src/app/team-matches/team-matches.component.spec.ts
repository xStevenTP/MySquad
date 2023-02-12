import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamMatchesComponent } from './team-matches.component';

describe('TeamMatchesComponent', () => {
  let component: TeamMatchesComponent;
  let fixture: ComponentFixture<TeamMatchesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TeamMatchesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamMatchesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
